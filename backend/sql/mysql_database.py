from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

class MySQLDatabase:
    def __init__(self):
        # Hardcoded database URL for MySQL
        self.db_url = "mysql+mysqlconnector://root:mohit%402901@localhost:3306/workwell"
        self.engine = create_engine(self.db_url)
        self.Session = sessionmaker(bind=self.engine)

    def execute_query(self, query: str):
        session = self.Session()
        try:
            result = session.execute(text(query)).fetchall()
            session.commit()
            return result
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()

    # def get_query(self, query: str, params: dict):
    #     session = self.Session()
    #     try:
    #         result = session.execute(text(query), params).fetchall()
    #         session.commit()
    #         return result
    #     except Exception as e:
    #         session.rollback()
    #         raise e
    #     finally:
    #         session.close()

    def get_query(self, query: str, params: dict = None):
        session = self.Session()
        try:
            if params:
                print(query)
                print(params)
                result = session.execute(text(query), params).fetchall()
            else:
                result = session.execute(text(query)).fetchall()
            session.commit()
            return [dict(r._mapping) for r in result]
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()

    def get_query_in(self, query, params: dict = None):
        session = self.Session()
        try:
            if params:
                print(query)
                print(params)
                result = session.execute(query, params).fetchall()
            else:
                result = session.execute(query).fetchall()
            session.commit()
            return [dict(r._mapping) for r in result]
        except Exception as e:
            session.rollback()
            print("An error occurred:", e)
            raise e
        finally:
            session.close()


database = MySQLDatabase()